import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../styles/globalStyles';

export const ValidationScreen = ({
  currentLetter, currentRound, rounds, roundData, gameCategories, handleNextRound, isProcessingNext, handleEndGameEarly, isHost
}: any) => {
  return (
    <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 }}>
        <Text style={[styles.title, { fontSize: 32, marginBottom: 0 }]}>
          RESULTADOS <Text style={{ color: '#6366f1' }}>"{currentLetter}"</Text>
        </Text>
        <TouchableOpacity style={styles.cancelCrossBtn} onPress={handleEndGameEarly}>
          <Text style={styles.cancelCrossText}>✖</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={{ flex: 1, width: '100%' }} showsVerticalScrollIndicator={false}>
        {roundData.map((playerRound: any, index: number) => {
          const roundTotal = gameCategories.reduce((sum: number, cat: string) => sum + (playerRound.scores?.[cat] || 0), 0);

          return (
            <View key={index} style={{ backgroundColor: '#18181b', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#27272a' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#3f3f46', paddingBottom: 10, marginBottom: 10 }}>
                <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 18, marginBottom: 0 }}>{playerRound.player_name}</Text>
                <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 18 }}>+{roundTotal} pts</Text>
              </View>

              {gameCategories.map((cat: string) => {
                const ansText = playerRound.answers?.[cat] || '';
                // Extraemos el puntaje exacto que la base de datos le asignó a esta palabra
                const itemScore = playerRound.scores?.[cat] || 0;
                const isInvalid = itemScore === 0;

                return (
                  <View key={cat} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.inputLabel, { fontSize: 10 }]}>{cat.replace('_', ' ').toUpperCase()}</Text>
                      <Text style={{ fontSize: 10, color: itemScore === 20 ? '#10b981' : itemScore === 10 ? '#f59e0b' : itemScore === 5 ? '#3b82f6' : '#ef4444' }}>
                        {itemScore > 0 ? `+${itemScore}` : '0'}
                      </Text>
                    </View>
                    <Text style={{ color: isInvalid ? '#ef4444' : '#fff', fontWeight: 'bold', textDecorationLine: isInvalid ? 'line-through' : 'none' }}>
                      {ansText || '---'}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {isHost ? (
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 15, opacity: isProcessingNext ? 0.7 : 1 }]} onPress={handleNextRound} disabled={isProcessingNext}>
          {isProcessingNext ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{currentRound < rounds ? 'Siguiente Ronda' : 'Ver Ganador'}</Text>}
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 15, padding: 16, alignItems: 'center' }}>
          <Text style={styles.waitingText}>Esperando que el creador continúe...</Text>
        </View>
      )}
    </View>
  );
};