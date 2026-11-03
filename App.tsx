import { useState, useEffect } from 'react';
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
  const [showModal, setShowModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [rounds, setRounds] = useState(3);
  
  const allCategories = ['colores', 'animal', 'pais', 'nombres_m', 'nombres_f'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);
  const [gameCategories, setGameCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    getPlayerName().then(storedName => {
      if (storedName) {
        setName(storedName);
        setIsRegistered(true);
      }
    });
  }, []);

  // Suscripción al canal para escuchar cuando el jugador 2 se une
  const subscribeToGame = (currentId: string) => {
    supabase.channel(`game-${currentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${currentId}` }, (payload) => {
        if (payload.new.status === 'playing') {
          setIsGameStarted(true);
        }
      }).subscribe();
  };

  const handleRegister = async () => {
    if (name.trim().length < 2) return;
    await savePlayerName(name);
    setIsRegistered(true);
  };

const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) // Si existe, la quita
        : [...prev, category]              // Si no existe, la agrega
    );
  };

const handleCreateGame = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos una categoría');
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
    
    const { data: game } = await supabase.from('games').select('id').eq('room_code', code).single();
    if (game) {
      await supabase.from('game_rounds').insert({ game_id: game.id, player_name: name });
      setGameId(game.id);
      setRoomCode(code);
      setGameCategories(selectedCategories); // Guardamos categorías en el creador
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
    // 1. Obtener datos de la sala
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, max_players, categories')
      .eq('room_code', code)
      .single();

    if (gameError || !game || game.status !== 'waiting') {
      Alert.alert('Error', 'Sala no encontrada o ya iniciada');
      setIsLoading(false);
      return;
    }

    // 2. Validar límite de jugadores
    const { count } = await supabase
      .from('game_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    if (count !== null && count >= game.max_players) {
      Alert.alert('Error', 'La sala está llena');
      setIsLoading(false);
      return;
    }

    // 3. Unirse
    await supabase.from('game_rounds').insert({ game_id: game.id, player_name: name });
    setGameCategories(game.categories || []); // Guardamos categorías en el jugador 2

    // 4. Si la sala se llena con este jugador, iniciar el juego para todos
    if (count !== null && count + 1 === game.max_players) {
      await supabase.from('games').update({ status: 'playing' }).eq('id', game.id);
    }

    setGameId(game.id);
    setRoomCode(code);
    subscribeToGame(game.id); // Suscribirse para escuchar el inicio del juego
    setIsLoading(false);
  };

const handleLeaveGame = () => {
    setRoomCode('');
    setJoinCode('');
    setGameId('');
    setIsGameStarted(false);
    setGameCategories([]);
    setAnswers({});
  };

// PANTALLA 3: EL JUEGO
  if (isGameStarted) {
    return (
      <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
        <Text style={styles.title}>Letra: A</Text>
        
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

        <TouchableOpacity style={styles.primaryButton} onPress={() => console.log('Basta para mi', answers)}>
          <Text style={styles.buttonText}>¡Basta para mí!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton, { marginTop: 20 }]} onPress={handleLeaveGame}>
          <Text style={styles.buttonText}>Abandonar Partida</Text>
        </TouchableOpacity>
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
            <Text style={styles.waitingText}>Esperando a que Belén se una...</Text>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowModal(true)} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Creando...' : 'Crear Sala Nueva'}</Text>
            </TouchableOpacity>
            
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>o únete a una existente</Text>
              <View style={styles.line} />
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="CÓDIGO DE 5 LETRAS" 
              placeholderTextColor="#52525b"
              value={joinCode} 
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={5}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinGame} disabled={isLoading}>
              <Text style={styles.buttonText}>Unirse a Partida</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODAL DE CONFIGURACIÓN */}
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
                  <TouchableOpacity 
                    key={cat} 
                    onPress={() => toggleCategory(cat)} 
                    style={[styles.categoryBtn, isActive && styles.selectorActive]}
                  >
                    <Text style={[styles.buttonText, { fontSize: 14 }]}>
                      {cat.replace('_', ' ').toUpperCase()}
                    </Text>
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

  // PANTALLA 1: INGRESO DE NOMBRE
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TUTIFRUTI</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Tu nombre" 
        placeholderTextColor="#52525b"
        value={name} 
        onChangeText={setName} 
      />
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
  code: { fontSize: 48, fontWeight: '900', color: '#6366f1', letterSpacing: 8 },
  waitingText: { color: '#a1a1aa', marginTop: 16, fontSize: 14 },
  actionsContainer: { width: '100%', gap: 16 },
  input: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 16, color: '#ffffff', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  primaryButton: { backgroundColor: '#6366f1', padding: 16, borderRadius: 16, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#27272a', padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#27272a' },
  orText: { color: '#52525b', paddingHorizontal: 16, fontSize: 12, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, width: '90%', borderWidth: 1, borderColor: '#27272a' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { color: '#a1a1aa', marginTop: 15, marginBottom: 5, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  selectorBtn: { backgroundColor: '#27272a', padding: 10, borderRadius: 8, width: 40, alignItems: 'center' },
  selectorActive: { backgroundColor: '#6366f1' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  categoryBtn: { backgroundColor: '#27272a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  boardContainer: { width: '100%', marginVertical: 20, flex: 1 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
  gameInput: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 12, color: '#ffffff', fontSize: 16 },
});