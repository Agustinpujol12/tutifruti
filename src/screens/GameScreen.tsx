import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/globalStyles';

export const GameScreen = ({
  currentLetter, currentRound, rounds, countdown, gameCategories, answers, setAnswers, handleBasta, handleEndGameEarly
}: any) => (
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