import { Text, View, TouchableOpacity } from 'react-native';
import { styles } from '../styles/globalStyles';

export const ValidationScreen = ({
  currentLetter, currentRound, rounds, roundData, gameCategories, invalidAnswers, setInvalidAnswers, getScore, handleNextRound, isProcessingNext, handleEndGameEarly, isHost
}: any) => (
  <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={styles.title}>Resultados Letra {currentLetter}</Text>
      <Text style={styles.inputLabel}>Ronda {currentRound}/{rounds}</Text>
    </View>
    <Text style={[styles.waitingText, {marginBottom: 20}]}>Toca una respuesta para marcarla como errada</Text>
    
    <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
      {roundData.map((playerRound: any, index: number) => {
        const totalScore = gameCategories.reduce((acc: number, cat: string) => acc + getScore(playerRound.player_name, cat), 0);
        
        return (
          <View key={index} style={{ flex: 1, backgroundColor: '#18181b', padding: 10, borderRadius: 12 }}>
            <Text style={[styles.highlight, { textAlign: 'center' }]}>{playerRound.player_name}</Text>
            <Text style={{ textAlign: 'center', color: '#6366f1', fontWeight: 'bold', fontSize: 20, marginBottom: 15 }}>+{totalScore}</Text>
            
            {gameCategories.map((cat: string) => {
              const ansText = playerRound.answers?.[cat];
              const isInvalid = invalidAnswers[`${playerRound.player_name}-${cat}`] || !ansText || ansText.trim() === '';
              const itemScore = getScore(playerRound.player_name, cat);

              return (
                <TouchableOpacity 
                  key={cat} 
                  style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 5 }}
                  onPress={() => setInvalidAnswers((prev: any) => ({...prev, [`${playerRound.player_name}-${cat}`]: !prev[`${playerRound.player_name}-${cat}`]}))}
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

    {isHost ? (
      <TouchableOpacity style={[styles.primaryButton, { marginTop: 20 }]} onPress={handleNextRound} disabled={isProcessingNext}>
        <Text style={styles.buttonText}>{currentRound >= rounds ? 'Finalizar Partida' : 'Siguiente Ronda'}</Text>
      </TouchableOpacity>
    ) : (
      <View style={{ marginTop: 20, padding: 16, alignItems: 'center' }}>
        <Text style={styles.waitingText}>Esperando a que el creador inicie la siguiente ronda...</Text>
      </View>
    )}
    
    <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={handleEndGameEarly}>
      <Text style={styles.buttonText}>Cancelar Partida</Text>
    </TouchableOpacity>
  </View>
);