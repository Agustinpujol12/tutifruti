import AsyncStorage from '@react-native-async-storage/async-storage';

export const savePlayerName = async (name: string) => await AsyncStorage.setItem('player_name', name);
export const getPlayerName = async () => await AsyncStorage.getItem('player_name');