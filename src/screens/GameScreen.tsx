import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/globalStyles';

export const GameScreen = ({
  currentLetter, currentRound, rounds, countdown, gameCategories, answers, setAnswers, handleBasta, handleEndGameEarly, roundTime, myTotalScore
}: any) => {
  const isBastaLocked = roundTime !== null && roundTime > 50;
  const lockedSeconds = roundTime !== null ? roundTime - 50 : 0;

  return (
<View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
      {countdown !== null ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingSubtext}>RONDA {currentRound} DE {rounds}</Text>
          <Text style={styles.spinLetter}>{countdown}</Text>
          <Text style={styles.waitingText}>La letra será: ?</Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View>
              <Text style={styles.title}>Letra: {currentLetter}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', backgroundColor: '#18181b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
              <Text style={styles.inputLabel}>RONDA {currentRound}/{rounds}</Text>
              <Text style={[styles.inputLabel, { color: roundTime !== null && roundTime <= 10 ? '#ef4444' : '#10b981', marginTop: 4 }]}>
                ⏱ TIEMPO: {roundTime}s
              </Text>
              <Text style={[styles.inputLabel, { color: '#f59e0b', marginTop: 4 }]}>
                🏆 PUNTOS: {myTotalScore}
              </Text>
            </View>
          </View>
          <View style={styles.boardContainer}>
            {gameCategories.map((cat: string) => (
              <View key={cat} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
                <TextInput 
                  style={styles.gameInput} 
                  value={answers[cat] || ''} 
                  onChangeText={val => setAnswers((prev: any) => ({ ...prev, [cat]: val }))}
                  placeholder={`Escribe un ${cat.replace('_', ' ')}`}
                  placeholderTextColor="#52525b"
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={[styles.primaryButton, isBastaLocked && { backgroundColor: '#3f3f46' }]} 
            onPress={handleBasta}
            disabled={isBastaLocked}
          >
            <Text style={styles.buttonText}>
              {isBastaLocked ? `Espera ${lockedSeconds}s...` : '¡Basta para mí!'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { marginTop: 20 }]} onPress={handleEndGameEarly}>
            <Text style={styles.buttonText}>Abandonar Partida</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};