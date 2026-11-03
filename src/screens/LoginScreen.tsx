import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/globalStyles';

export const LoginScreen = ({ name, setName, onRegister }: any) => (
  <View style={styles.container}>
    <Text style={styles.logo}>TUTIFRUTI</Text>
    <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor="#52525b" value={name} onChangeText={setName} />
    <TouchableOpacity style={styles.primaryButton} onPress={onRegister}>
      <Text style={styles.buttonText}>Comenzar</Text>
    </TouchableOpacity>
  </View>
);