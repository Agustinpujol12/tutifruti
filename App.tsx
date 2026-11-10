import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native'; // Añade esto a tus otras importaciones (Text, View, etc.)
import { Alert } from 'react-native'; // Asegúrate de importar AppStateimport { savePlayerName, getPlayerName } from './lib/storage';
import { savePlayerName, getPlayerName } from './lib/storage';
import { supabase } from './lib/supabase';
import * as Haptics from 'expo-haptics';

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
  
  // SOLUCIÓN: Las 5 categorías estandarizadas exactas para la base de datos
  const allCategories = ['paises', 'colores', 'animales', 'frutas_verduras', 'partes_cuerpo', 'ropa', 'profesiones'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);

  const [currentRound, setCurrentRound] = useState(1);
  const [gameCategories, setGameCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roundTime, setRoundTime] = useState<number | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [myTotalScore, setMyTotalScore] = useState(0);

  const [isValidating, setIsValidating] = useState(false);
  const [roundData, setRoundData] = useState<any[]>([]);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  
  const [isFinishedGame, setIsFinishedGame] = useState(false);
  const [finalResults, setFinalResults] = useState<any[]>([]);

  const [isHost, setIsHost] = useState(false);
  // NUEVO: Referencia para evitar el estado fantasma en el WebSocket
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const currentLetterRef = useRef(currentLetter);
  useEffect(() => {
    currentLetterRef.current = currentLetter;
  }, [currentLetter]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const isGameStartedRef = useRef(isGameStarted);
useEffect(() => { isGameStartedRef.current = isGameStarted; }, [isGameStarted]);

const isValidatingRef = useRef(isValidating);
useEffect(() => { isValidatingRef.current = isValidating; }, [isValidating]);

useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && gameId) {
        const { data } = await supabase.from('games')
          .select('status, forfeit_player')
          .eq('id', gameId)
          .single();
          
        if (data && data.status === 'forfeit') {
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          setRoundTime(null);
          setCountdown(null);
          setIsGameStarted(false);
          setIsValidating(false);
          setIsFinishedGame(true);
          setFinalResults([{ isForfeit: true, forfeiter: data.forfeit_player }]);
        }
      }
    });

    return () => subscription.remove();
  }, [gameId]);

 const handleLeaveGame = async () => { // Asegúrate de agregar 'async'
    // CRÍTICO: Destruye el canal de Presence y Postgres para evitar cruces en nuevas partidas
    await supabase.removeAllChannels(); 
    
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
    setCurrentRound(1);
    setIsFinishedGame(false);
    setFinalResults([]);
    setIsHost(false);
    setActiveLetter(null);
    currentLetterRef.current = null;
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    setRoundTime(null);
    setMyTotalScore(0);
  };

  const startCountdownSequence = (finalLetter: string, activeGameId: string) => {
    setCurrentLetter(finalLetter);
    setActiveLetter(null); 
    setCountdown(5);

    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    setRoundTime(null);

    let currentCount = 5;
    const timer = setInterval(() => {
      currentCount--;
      if (currentCount > 0) {
        setCountdown(currentCount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        clearInterval(timer);
        setCountdown(null);
        setActiveLetter(finalLetter); 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startRoundTimer(60, activeGameId);
      }
    }, 1000);
  };

  const startRoundTimer = (duration: number, activeGameId: string) => {
    const endTime = Date.now() + duration * 1000;
    setRoundTime(duration);
    
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    
    roundTimerRef.current = setInterval(async () => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      if (timeLeft > 0) {
        setRoundTime(timeLeft);
        if (timeLeft <= 5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
        }
      } else {
        // Detener el reloj inmediatamente para evitar que envíe múltiples órdenes
        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        setRoundTime(null);
        
        // CRÍTICO: Esperar la confirmación de Supabase (await) en lugar de un .then() vacío
        if (isHostRef.current) {
          const { error } = await supabase
            .from('games')
            .update({ status: 'validating' })
            .eq('id', activeGameId);
            
          if (error) console.error("Fallo crítico al cerrar ronda:", error);
        }
      }
    }, 500);
  };

const subscribeToGame = (currentId: string) => {
    let disconnectTimer: NodeJS.Timeout | null = null;

    // 1. Configuramos el canal para que rastree la "Presencia" usando el nombre del jugador
    const channel = supabase.channel(`game-${currentId}`, {
      config: { presence: { key: name } }
    });

    channel
      // 2. Escuchamos quién entra y sale en tiempo real
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeCount = Object.keys(state).length;

        // Si el juego está corriendo y falta un jugador...
        if (isGameStartedRef.current && !isValidatingRef.current && activeCount < maxPlayers) {
          if (!disconnectTimer) {
            disconnectTimer = setTimeout(async () => {
              // Tu celular ejecuta el Forfeit porque el oponente no volvió a tiempo
              await supabase.from('games').update({ 
                status: 'forfeit', 
                forfeit_player: 'El oponente' 
              }).eq('id', currentId);
            }, 5000);
          }
        } else {
          // Si el jugador reconecta a tiempo o la partida no empezó, abortamos el temporizador
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
          }
        }
      })
      // 3. Tus estados de base de datos intactos
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${currentId}` }, async (payload) => {
        
        if (payload.new.status === 'playing') {
          setIsGameStarted(true);
          setIsValidating(false);
          setIsFinishedGame(false); 
          setAnswers({});
          setRoundData([]);
          setCurrentRound(payload.new.current_round || 1);
          
          const fetchScore = async () => {
            const { data } = await supabase.from('game_rounds')
              .select('total_score')
              .eq('game_id', currentId)
              .eq('player_name', name)
              .single();
            if (data) setMyTotalScore(data.total_score || 0);
          };
          fetchScore();
        }
        
        if (payload.new.current_letter && payload.new.current_letter !== currentLetterRef.current) {
          currentLetterRef.current = payload.new.current_letter;
          startCountdownSequence(payload.new.current_letter, currentId);
        }

        if (payload.new.status === 'validating') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          setRoundTime(null);
          
          const cleanAnswers = Object.keys(answersRef.current).reduce((acc: any, key) => {
            const val = answersRef.current[key] || '';
            acc[key] = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return acc;
          }, {});

          await supabase.from('game_rounds')
            .update({ answers: cleanAnswers })
            .eq('game_id', currentId)
            .eq('player_name', name);
          
          setTimeout(async () => {
            if (isHostRef.current) {
              await supabase.rpc('calculate_round_scores', { 
                p_game_id: currentId, 
                p_letter: currentLetterRef.current 
              });
            }
            
            setTimeout(async () => {
              const { data } = await supabase.from('game_rounds')
                .select('player_name, answers, scores, total_score')
                .eq('game_id', currentId);
                
              if (data) {
                setRoundData(data);
                const myData = data.find(d => d.player_name === name);
                if (myData) setMyTotalScore(myData.total_score || 0);
              }
              setIsGameStarted(false);
              setIsValidating(true);
            }, 1000);
          }, 1500);
        }

        if (payload.new.status === 'forfeit') {
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          setRoundTime(null);
          setCountdown(null);
          setIsGameStarted(false);
          setIsValidating(false);
          setIsFinishedGame(true);
          setFinalResults([{ isForfeit: true, forfeiter: payload.new.forfeit_player }]);
        }
        
        if (payload.new.status === 'finished') {
          setIsGameStarted(false);
          setIsValidating(false);
          setIsFinishedGame(true);
          const { data } = await supabase.from('game_rounds')
            .select('player_name, total_score')
            .eq('game_id', currentId)
            .order('total_score', { ascending: false });
          if (data) setFinalResults(data);
        }
      })
      // 4. Iniciar canal y enviar presencia
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ player: name });
        }
      });
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
      setIsHost(true);
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
    setIsHost(false);
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

      currentLetterRef.current = randomLetter;
      setIsGameStarted(true);
      setIsValidating(false);
      startCountdownSequence(randomLetter, game.id);
    }
    setIsLoading(false);
  };

  const handleBasta = async () => {
    await supabase.from('games').update({ status: 'validating' }).eq('id', gameId);
  };

  const handleEndGameEarly = async () => {
    await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);
  };

  const handleNextRound = async () => {
    setIsProcessingNext(true);
    const { data: g } = await supabase.from('games')
      .select('status, current_round, total_rounds, used_letters')
      .eq('id', gameId)
      .single();
      
    if (!g || g.status !== 'validating') {
      setIsProcessingNext(false);
      return; 
    }

    await supabase.from('game_rounds').update({ answers: {} }).eq('game_id', gameId);

    if (g.current_round < g.total_rounds) {
      const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let newLetter = "";
      while (!newLetter || (g.used_letters && g.used_letters.includes(newLetter))) {
        newLetter = abc[Math.floor(Math.random() * abc.length)];
      }
      
      await supabase.from('games').update({ 
        status: 'playing', 
        current_round: g.current_round + 1, 
        used_letters: g.used_letters + newLetter, 
        current_letter: newLetter 
      }).eq('id', gameId);
    } else {
      await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);
    }
    
    setIsProcessingNext(false);
  };

  const handleRematch = async () => {
    await supabase.from('game_rounds')
      .update({ total_score: 0, answers: {} })
      .eq('game_id', gameId);

    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = abc[Math.floor(Math.random() * abc.length)];

    await supabase.from('games').update({ 
      status: 'playing', 
      current_round: 1, 
      used_letters: randomLetter, 
      current_letter: randomLetter 
    }).eq('id', gameId);
  };

  if (isFinishedGame) return <WinnerScreen finalResults={finalResults} onLeave={handleLeaveGame} isHost={isHost} handleRematch={handleRematch} />;
  
  if (isValidating) return <ValidationScreen
  currentLetter={currentLetterRef.current}
  currentRound={currentRound}
  rounds={rounds}
  roundData={roundData}
  gameCategories={allCategories}
  handleNextRound={handleNextRound}
  isProcessingNext={isProcessingNext}
  handleEndGameEarly={handleEndGameEarly}
  isHost={isHostRef.current}
  
  // NUEVAS PROPS:
currentId={gameId}
  name={name}
  refreshData={async () => {
    // Esta función recarga los puntos si una palabra es aprobada por votación
    const { data } = await supabase.from('game_rounds')
      .select('player_name, answers, scores, total_score')
      .eq('game_id', gameId);
    if (data) {
      setRoundData(data);
      const myData = data.find(d => d.player_name === name);
      if (myData) setMyTotalScore(myData.total_score || 0);
    }
  }}
/>
  
  if (isGameStarted) return <GameScreen 
    currentLetter={activeLetter} currentRound={currentRound} rounds={rounds} countdown={countdown} 
    gameCategories={gameCategories} answers={answers} setAnswers={setAnswers} handleBasta={handleBasta} handleEndGameEarly={handleEndGameEarly} 
    roundTime={roundTime} myTotalScore={myTotalScore} 
  />;
  
  if (isRegistered) return <LobbyScreen 
    name={name} roomCode={roomCode} joinCode={joinCode} setJoinCode={setJoinCode} isLoading={isLoading} 
    showModal={showModal} setShowModal={setShowModal} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers} 
    rounds={rounds} setRounds={setRounds} selectedCategories={selectedCategories} toggleCategory={toggleCategory} 
    allCategories={allCategories} handleCreateGame={handleCreateGame} handleJoinGame={handleJoinGame} handleLeaveGame={handleLeaveGame} 
  />;

  return <LoginScreen name={name} setName={setName} onRegister={handleRegister} />;
}