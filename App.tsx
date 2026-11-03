import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { savePlayerName, getPlayerName } from './lib/storage';
import { supabase } from './lib/supabase';

// Importación de las pantallas refactorizadas
import { LoginScreen } from './src/screens/LoginScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ValidationScreen } from './src/screens/ValidationScreen';
import { WinnerScreen } from './src/screens/WinnerScreen';

export default function App() {
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameId, setGameId] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [rounds, setRounds] = useState(3);
  const allCategories = ['colores', 'animal', 'pais', 'nombres_m', 'nombres_f'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);

  const [currentRound, setCurrentRound] = useState(1);
  const [gameCategories, setGameCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [roundData, setRoundData] = useState<any[]>([]);
  const [invalidAnswers, setInvalidAnswers] = useState<Record<string, boolean>>({});
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  
  const [isFinishedGame, setIsFinishedGame] = useState(false);
  const [finalResults, setFinalResults] = useState<any[]>([]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    getPlayerName().then(storedName => {
      if (storedName) {
        setName(storedName);
        setIsRegistered(true);
      }
    });
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const handleLeaveGame = () => {
    setRoomCode('');
    setJoinCode('');
    setGameId('');
    setIsGameStarted(false);
    setGameCategories([]);
    setAnswers({});
    setCurrentLetter(null);
    setCountdown(null);
    setIsValidating(false);
    setRoundData([]);
    setInvalidAnswers({});
    setCurrentRound(1);
    setIsFinishedGame(false);
    setFinalResults([]);
  };

  const startCountdownSequence = (finalLetter: string) => {
    setCurrentLetter(finalLetter);
    setCountdown(5);

    let currentCount = 5;
    const timer = setInterval(() => {
      currentCount--;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(timer);
        setCountdown(null);
      }
    }, 1000);
  };

  const subscribeToGame = (currentId: string) => {
    supabase.channel(`game-${currentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${currentId}` }, async (payload) => {
        if (payload.new.status === 'playing') {
          setIsGameStarted(true);
          setIsValidating(false);
          setAnswers({});
          setInvalidAnswers({});
          setRoundData([]);
          setCurrentRound(payload.new.current_round || 1);
        }
        if (payload.new.current_letter) {
          setCurrentLetter(prev => {
            if (prev !== payload.new.current_letter) {
              setTimeout(() => startCountdownSequence(payload.new.current_letter), 0);
              return payload.new.current_letter;
            }
            return prev;
          });
        }
        if (payload.new.status === 'validating') {
          await supabase.from('game_rounds')
            .update({ answers: answersRef.current })
            .eq('game_id', currentId)
            .eq('player_name', name);
          
          setTimeout(async () => {
            const { data } = await supabase.from('game_rounds').select('player_name, answers').eq('game_id', currentId);
            if (data) setRoundData(data);
            setIsGameStarted(false);
            setIsValidating(true);
          }, 1500);
        }
        if (payload.new.status === 'finished_game') {
          const { data } = await supabase.from('game_rounds')
            .select('player_name, total_score')
            .eq('game_id', currentId)
            .order('total_score', { ascending: false });
          if (data) setFinalResults(data);
          
          setIsValidating(false);
          setIsGameStarted(false);
          setIsFinishedGame(true);
        }
        if (payload.new.status === 'finished') {
          handleLeaveGame();
        }
      })
      .subscribe();
  };

  const handleRegister = async () => {
    if (name.trim().length < 2) return;
    await savePlayerName(name);
    setIsRegistered(true);
  };

  const handleCreateGame = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una categoría');
      return;
    }
    setShowModal(false);
    setIsLoading(true);
    
    const { data: code, error } = await supabase.rpc('create_game_room', {
      p_max_players: maxPlayers,
      p_total_rounds: rounds,
      p_categories: selectedCategories
    });
    
    if (error) {
      Alert.alert('Error', 'No se pudo crear la sala');
      setIsLoading(false);
      return;
    }
    
    const { data: game } = await supabase.from('games').select('id, categories').eq('room_code', code).single();
    if (game) {
      await supabase.from('game_rounds').insert({ game_id: game.id, player_name: name });
      setGameId(game.id);
      setRoomCode(code);
      setGameCategories(game.categories || selectedCategories);
      subscribeToGame(game.id);
    }
    setIsLoading(false);
  };

  const handleJoinGame = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 5) {
      Alert.alert('Error', 'El código debe tener 5 caracteres');
      return;
    }
    setIsLoading(true);

    const { data: game, error: gameError } = await supabase.from('games').select('id, status, max_players, categories, total_rounds, current_round').eq('room_code', code).single();
    if (gameError || !game || game.status !== 'waiting') {
      Alert.alert('Error', 'Sala no encontrada o iniciada');
      setIsLoading(false);
      return;
    }

    const { count } = await supabase.from('game_rounds').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
    if (count !== null && count >= game.max_players) {
      Alert.alert('Error', 'La sala está llena');
      setIsLoading(false);
      return;
    }

    await supabase.from('game_rounds').insert({ game_id: game.id, player_name: name });
    setGameCategories(game.categories || []);
    setRounds(game.total_rounds);
    setCurrentRound(game.current_round || 1);
    setGameId(game.id);
    setRoomCode(code);
    subscribeToGame(game.id); 

    if (count !== null && count + 1 === game.max_players) {
      const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const randomLetter = abc[Math.floor(Math.random() * abc.length)];
      
      await supabase.from('games').update({ 
        status: 'playing', 
        current_letter: randomLetter,
        used_letters: randomLetter
      }).eq('id', game.id);

      setIsGameStarted(true);
      startCountdownSequence(randomLetter);
    }
    setIsLoading(false);
  };

  const handleBasta = async () => {
    await supabase.from('games').update({ status: 'validating' }).eq('id', gameId);
  };

  const handleEndGameEarly = async () => {
    await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);
  };

  const getScore = (pName: string, cat: string) => {
    const pAns = roundData.find(p => p.player_name === pName)?.answers?.[cat];
    const isPValid = pAns && pAns.trim().length > 0 && !invalidAnswers[`${pName}-${cat}`];
    
    if (!isPValid) return 0;

    const opponents = roundData.filter(p => p.player_name !== pName);
    const anyOpponentValid = opponents.some(opp => {
      const oAns = opp.answers?.[cat];
      return oAns && oAns.trim().length > 0 && !invalidAnswers[`${opp.player_name}-${cat}`];
    });

    return anyOpponentValid ? 10 : 20; 
  };

  const handleNextRound = async () => {
    setIsProcessingNext(true);
    const { data: g } = await supabase.from('games').select('status, current_round, total_rounds, used_letters, current_letter').eq('id', gameId).single();
    if (!g || g.status !== 'validating') return; 

    for (const p of roundData) {
      const roundScore = gameCategories.reduce((acc, cat) => acc + getScore(p.player_name, cat), 0);
      const { data: currentP } = await supabase.from('game_rounds').select('total_score').eq('game_id', gameId).eq('player_name', p.player_name).single();
      const newTotal = (currentP?.total_score || 0) + roundScore;
      await supabase.from('game_rounds').update({ total_score: newTotal, answers: {} }).eq('game_id', gameId).eq('player_name', p.player_name);
    }

    if (g.current_round >= g.total_rounds) {
      await supabase.from('games').update({ status: 'finished_game' }).eq('id', gameId);
    } else {
      const nextRoundNum = g.current_round + 1;
      const updatedUsed = (g.used_letters || '') + g.current_letter;
      
      let nextLetter = '';
      const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      do {
        nextLetter = abc[Math.floor(Math.random() * abc.length)];
      } while (updatedUsed.includes(nextLetter));

      await supabase.from('games').update({ 
        status: 'playing', 
        current_round: nextRoundNum, 
        used_letters: updatedUsed, 
        current_letter: nextLetter 
      }).eq('id', gameId);
    }
    
    setIsProcessingNext(false);
  };

  // Enrutador de pantallas
  if (isFinishedGame) return <WinnerScreen finalResults={finalResults} onLeave={handleLeaveGame} />;
  
  if (isValidating) return <ValidationScreen 
    currentLetter={currentLetter} currentRound={currentRound} rounds={rounds} roundData={roundData} 
    gameCategories={gameCategories} invalidAnswers={invalidAnswers} setInvalidAnswers={setInvalidAnswers} 
    getScore={getScore} handleNextRound={handleNextRound} isProcessingNext={isProcessingNext} handleEndGameEarly={handleEndGameEarly} 
  />;
  
  if (isGameStarted) return <GameScreen 
    currentLetter={currentLetter} currentRound={currentRound} rounds={rounds} countdown={countdown} 
    gameCategories={gameCategories} answers={answers} setAnswers={setAnswers} handleBasta={handleBasta} handleEndGameEarly={handleEndGameEarly} 
  />;
  
  if (isRegistered) return <LobbyScreen 
    name={name} roomCode={roomCode} joinCode={joinCode} setJoinCode={setJoinCode} isLoading={isLoading} 
    showModal={showModal} setShowModal={setShowModal} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers} 
    rounds={rounds} setRounds={setRounds} selectedCategories={selectedCategories} toggleCategory={toggleCategory} 
    allCategories={allCategories} handleCreateGame={handleCreateGame} handleJoinGame={handleJoinGame} handleLeaveGame={handleLeaveGame} 
  />;

  return <LoginScreen name={name} setName={setName} onRegister={handleRegister} />;
}