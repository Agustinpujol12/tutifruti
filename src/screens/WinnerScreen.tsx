import { Text, View, TouchableOpacity } from 'react-native';
import { styles } from '../styles/globalStyles';

export const WinnerScreen = ({ finalResults, onLeave, isHost, handleRematch }: any) => {
  const winner = finalResults[0];
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: '#10b981', fontSize: 40 }]}>¡PARTIDA FINALIZADA!</Text>
      <Text style={styles.waitingSubtext}>Ganador indiscutido:</Text>
      <Text style={[styles.code, { marginBottom: 20 }]}>{winner?.player_name}</Text>
      
      <View style={{ width: '100%', marginTop: 10 }}>
        {finalResults.map((p: any, index: number) => (
          <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#18181b', padding: 20, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: index === 0 ? '#6366f1' : '#27272a' }}>
            <Text style={[styles.buttonText, { color: index === 0 ? '#6366f1' : '#fff' }]}>
              {index + 1}. {p.player_name}
            </Text>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{p.total_score} pts</Text>
          </View>
        ))}
      </View>

      {isHost ? (
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 40 }]} onPress={handleRematch}>
          <Text style={styles.buttonText}>Jugar Revancha</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 40, padding: 16, alignItems: 'center' }}>
          <Text style={styles.waitingText}>Esperando a que el creador inicie la revancha...</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.secondaryButton, { marginTop: isHost ? 10 : 0 }]} onPress={onLeave}>
        <Text style={styles.buttonText}>Volver al Menú</Text>
      </TouchableOpacity>
    </View>
  );
};