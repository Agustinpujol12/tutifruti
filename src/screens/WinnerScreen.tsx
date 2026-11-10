import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../styles/globalStyles';

export const WinnerScreen = ({ finalResults, onLeave, isHost, handleRematch }: any) => {
  // 1. Interceptar victoria por abandono (minimizar la app)
  const forfeitData = finalResults?.find((r: any) => r.isForfeit);

  if (forfeitData) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { fontSize: 32, color: '#ef4444' }]}>¡PARTIDA CANCELADA!</Text>
        <Text style={{ fontSize: 18, color: '#a1a1aa', textAlign: 'center', marginBottom: 30 }}>
          <Text style={{ fontWeight: 'bold' }}>{forfeitData.forfeiter}</Text> minimizó el juego por más de 5 segundos.
        </Text>
        <Text style={{ color: '#10b981', fontSize: 24, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' }}>
          {forfeitData.forfeiter === "Tú" ? "Pierdes por abandono." : "Victoria por abandono."}
        </Text>
        
        {isHost && (
          <TouchableOpacity style={[styles.primaryButton, { marginBottom: 15 }]} onPress={handleRematch}>
            <Text style={styles.buttonText}>Jugar Revancha</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={onLeave}>
          <Text style={styles.buttonText}>Salir al Menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Pantalla de resultados estándar
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 36, color: '#10b981' }]}>¡RESULTADOS!</Text>
      
      <ScrollView style={{ flex: 1, width: '100%', marginTop: 20 }} showsVerticalScrollIndicator={false}>
        {finalResults?.map((player: any, index: number) => (
          <View key={index} style={{ 
            backgroundColor: index === 0 ? '#3f3f46' : '#18181b', 
            padding: 20, 
            borderRadius: 12, 
            marginBottom: 15,
            borderWidth: index === 0 ? 2 : 1,
            borderColor: index === 0 ? '#f59e0b' : '#27272a',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: index === 0 ? '#f59e0b' : '#a1a1aa', marginRight: 15 }}>
                #{index + 1}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
                {player.player_name}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>
              {player.total_score} pts
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ width: '100%', marginTop: 20 }}>
        {isHost && (
          <TouchableOpacity style={[styles.primaryButton, { marginBottom: 15 }]} onPress={handleRematch}>
            <Text style={styles.buttonText}>Jugar Revancha</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={onLeave}>
          <Text style={styles.buttonText}>Salir al Menú</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};