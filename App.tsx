import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { savePlayerName, getPlayerName } from './lib/storage';
import { supabase } from './lib/supabase';

export default function App() {
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameId, setGameId] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Configuración de Sala
  const [showModal, setShowModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [rounds, setRounds] = useState(3);
  const allCategories = ['colores', 'animal', 'pais', 'nombres_m', 'nombres_f'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);

  // Estados de Partida, Rondas y Cuenta Regresiva
  const [currentRound, setCurrentRound] = useState(1);
  const [gameCategories, setGameCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Estados de Validación y Fin de Juego
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
    
    // Validamos que otro jugador no haya avanzado ya la ronda
    const { data: g } = await supabase.from('games').select('status, current_round, total_rounds, used_letters, current_letter').eq('id', gameId).single();
    if (!g || g.status !== 'validating') return; 

    // 1. Acumular y guardar los puntajes de esta ronda en la BD
    for (const p of roundData) {
      const roundScore = gameCategories.reduce((acc, cat) => acc + getScore(p.player_name, cat), 0);
      const { data: currentP } = await supabase.from('game_rounds').select('total_score').eq('game_id', gameId).eq('player_name', p.player_name).single();
      const newTotal = (currentP?.total_score || 0) + roundScore;
      await supabase.from('game_rounds').update({ total_score: newTotal, answers: {} }).eq('game_id', gameId).eq('player_name', p.player_name);
    }

    // 2. Si fue la última ronda, terminamos el juego
    if (g.current_round >= g.total_rounds) {
      await supabase.from('games').update({ status: 'finished_game' }).eq('id', gameId);
    } else {
      // 3. Generamos letra única que no haya salido
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

  // PANTALLA 5: RESULTADOS FINALES Y GANADOR
  if (isFinishedGame) {
    const winner = finalResults[0];
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: '#10b981', fontSize: 40 }]}>¡PARTIDA FINALIZADA!</Text>
        <Text style={styles.waitingSubtext}>Ganador indiscutido:</Text>
        <Text style={[styles.code, { marginBottom: 20 }]}>{winner?.player_name}</Text>
        
        <View style={{ width: '100%', marginTop: 10 }}>
          {finalResults.map((p, index) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#18181b', padding: 20, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: index === 0 ? '#6366f1' : '#27272a' }}>
              <Text style={[styles.buttonText, { color: index === 0 ? '#6366f1' : '#fff' }]}>
                {index + 1}. {p.player_name}
              </Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{p.total_score} pts</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.primaryButton, { marginTop: 40 }]} onPress={handleLeaveGame}>
          <Text style={styles.buttonText}>Volver al Menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // PANTALLA 4: RESULTADOS PARCIALES (VALIDACIÓN)
  if (isValidating) {
    return (
      <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.title}>Resultados Letra {currentLetter}</Text>
          <Text style={styles.inputLabel}>Ronda {currentRound}/{rounds}</Text>
        </View>
        <Text style={[styles.waitingText, {marginBottom: 20}]}>Toca una respuesta para marcarla como errada</Text>
        
        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
          {roundData.map((playerRound, index) => {
            const totalScore = gameCategories.reduce((acc, cat) => acc + getScore(playerRound.player_name, cat), 0);
            
            return (
              <View key={index} style={{ flex: 1, backgroundColor: '#18181b', padding: 10, borderRadius: 12 }}>
                <Text style={[styles.highlight, { textAlign: 'center' }]}>{playerRound.player_name}</Text>
                <Text style={{ textAlign: 'center', color: '#6366f1', fontWeight: 'bold', fontSize: 20, marginBottom: 15 }}>+{totalScore}</Text>
                
                {gameCategories.map(cat => {
                  const ansText = playerRound.answers?.[cat];
                  const isInvalid = invalidAnswers[`${playerRound.player_name}-${cat}`] || !ansText || ansText.trim() === '';
                  const itemScore = getScore(playerRound.player_name, cat);

                  return (
                    <TouchableOpacity 
                      key={cat} 
                      style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 5 }}
                      onPress={() => setInvalidAnswers(prev => ({...prev, [`${playerRound.player_name}-${cat}`]: !prev[`${playerRound.player_name}-${cat}`]}))}
                      disabled={!ansText || ansText.trim() === ''}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.inputLabel, { fontSize: 10 }]}>{cat.toUpperCase()}</Text>
                        <Text style={{ fontSize: 10, color: itemScore === 20 ? '#10b981' : itemScore === 10 ? '#f59e0b' : '#ef4444' }}>{itemScore > 0 ? `+${itemScore}` : '0'}</Text>
                      </View>
                      <Text style={{ color: isInvalid ? '#ef4444' : '#fff', fontWeight: 'bold', textDecorationLine: isInvalid ? 'line-through' : 'none' }}>
                        {ansText || '---'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.primaryButton, { marginTop: 20 }]} onPress={handleNextRound} disabled={isProcessingNext}>
          <Text style={styles.buttonText}>{currentRound >= rounds ? 'Finalizar Partida' : 'Siguiente Ronda'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={handleEndGameEarly}>
          <Text style={styles.buttonText}>Cancelar Partida</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // PANTALLA 3: EL JUEGO Y CUENTA REGRESIVA
  if (isGameStarted) {
    return (
      <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
        {countdown !== null ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingSubtext}>RONDA {currentRound} DE {rounds}</Text>
            <Text style={styles.spinLetter}>{countdown}</Text>
            <Text style={styles.waitingText}>La letra será: {currentLetter}</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.title}>Letra: {currentLetter}</Text>
              <Text style={styles.inputLabel}>Ronda {currentRound}/{rounds}</Text>
            </View>
            <View style={styles.boardContainer}>
              {gameCategories.map(cat => (
                <View key={cat} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
                  <TextInput 
                    style={styles.gameInput} 
                    value={answers[cat] || ''} 
                    onChangeText={val => setAnswers(prev => ({ ...prev, [cat]: val }))}
                    placeholder={`Escribe un ${cat.replace('_', ' ')}`}
                    placeholderTextColor="#52525b"
                    autoCapitalize="none"
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleBasta}>
              <Text style={styles.buttonText}>¡Basta para mí!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 20 }]} onPress={handleEndGameEarly}>
              <Text style={styles.buttonText}>Abandonar Partida</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // PANTALLA 2: LOBBY Y ESPERA
  if (isRegistered) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Jugador: <Text style={styles.highlight}>{name}</Text></Text>
        </View>
        
        {roomCode ? (
          <View style={styles.card}>
            <Text style={styles.label}>CÓDIGO DE SALA</Text>
            <Text style={styles.code}>{roomCode}</Text>
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
            <Text style={styles.waitingText}>Esperando a que se llene la sala...</Text>
            
            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10, width: '100%' }]} onPress={handleLeaveGame}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowModal(true)} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Cargando...' : 'Crear Sala Nueva'}</Text>
            </TouchableOpacity>
            
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>o únete a una existente</Text>
              <View style={styles.line} />
            </View>

            <TextInput style={styles.input} placeholder="CÓDIGO DE 5 LETRAS" placeholderTextColor="#52525b" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" maxLength={5} />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinGame} disabled={isLoading}>
              <Text style={styles.buttonText}>Unirse a Partida</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={showModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Configurar Partida</Text>
              
              <Text style={styles.modalLabel}>Jugadores (Máx): {maxPlayers}</Text>
              <View style={styles.row}>
                {[2, 3, 4, 5, 6].map(num => (
                  <TouchableOpacity key={num} onPress={() => setMaxPlayers(num)} style={[styles.selectorBtn, maxPlayers === num && styles.selectorActive]}>
                    <Text style={styles.buttonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Rondas: {rounds}</Text>
              <View style={styles.row}>
                {[1, 3, 5, 10].map(num => (
                  <TouchableOpacity key={num} onPress={() => setRounds(num)} style={[styles.selectorBtn, rounds === num && styles.selectorActive]}>
                    <Text style={styles.buttonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Categorías seleccionadas: {selectedCategories.length}</Text>
              <View style={styles.categoryContainer}>
                {allCategories.map(cat => {
                  const isActive = selectedCategories.includes(cat);
                  return (
                    <TouchableOpacity key={cat} onPress={() => toggleCategory(cat)} style={[styles.categoryBtn, isActive && styles.selectorActive]}>
                      <Text style={[styles.buttonText, { fontSize: 14 }]}>{cat.replace('_', ' ').toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.primaryButton, {marginTop: 20}]} onPress={handleCreateGame}>
                <Text style={styles.buttonText}>Confirmar y Crear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, {marginTop: 10}]} onPress={() => setShowModal(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TUTIFRUTI</Text>
      <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor="#52525b" value={name} onChangeText={setName} />
      <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
        <Text style={styles.buttonText}>Comenzar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 40, letterSpacing: 2 },
  header: { position: 'absolute', top: 60, left: 24 },
  greeting: { color: '#a1a1aa', fontSize: 16 },
  highlight: { color: '#ffffff', fontWeight: 'bold' },
  card: { backgroundColor: '#18181b', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  label: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  code: { fontSize: 48, fontWeight: '900', color: '#6366f1', letterSpacing: 8, textAlign: 'center' },
  waitingText: { color: '#a1a1aa', marginTop: 16, fontSize: 14, textAlign: 'center' },
  waitingSubtext: { color: '#6366f1', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  actionsContainer: { width: '100%', gap: 16 },
  input: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 16, color: '#ffffff', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  primaryButton: { backgroundColor: '#6366f1', padding: 16, borderRadius: 16, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#27272a', padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#27272a' },
  orText: { color: '#52525b', paddingHorizontal: 16, fontSize: 12, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, width: '90%', borderWidth: 1, borderColor: '#27272a' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { color: '#a1a1aa', marginTop: 15, marginBottom: 5, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  selectorBtn: { backgroundColor: '#27272a', padding: 10, borderRadius: 8, width: 40, alignItems: 'center' },
  selectorActive: { backgroundColor: '#6366f1' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  categoryBtn: { backgroundColor: '#27272a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  boardContainer: { width: '100%', flex: 1 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
  gameInput: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 12, color: '#ffffff', fontSize: 16 },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  spinLetter: { fontSize: 90, fontWeight: '900', color: '#6366f1', marginBottom: 10 }
});