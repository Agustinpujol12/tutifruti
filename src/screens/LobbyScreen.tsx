import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { styles } from '../styles/globalStyles';

export const LobbyScreen = ({
  name, roomCode, joinCode, setJoinCode, isLoading, showModal, setShowModal,
  maxPlayers, setMaxPlayers, rounds, setRounds, selectedCategories, toggleCategory,
  allCategories, handleCreateGame, handleJoinGame, handleLeaveGame
}: any) => (
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

          <Text style={styles.modalLabel}>Categorías: {selectedCategories.length}</Text>
          <View style={styles.categoryContainer}>
            {allCategories.map((cat: string) => {
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