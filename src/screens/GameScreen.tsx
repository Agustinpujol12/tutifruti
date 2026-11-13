import { Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import React, { useRef } from 'react';
import { styles } from '../styles/globalStyles';

export const GameScreen = ({
  currentLetter, currentRound, rounds, countdown, gameCategories, answers, setAnswers, handleBasta, handleEndGameEarly, roundTime, myTotalScore, roundData
}: any) => {
  const inputRefs = useRef<any[]>([]);
  const isBastaLocked = roundTime !== null && roundTime > 50;
  const lockedSeconds = roundTime !== null ? roundTime - 50 : 0;

  const confirmCancel = () => {
    Alert.alert(
      'Cancelar Partida',
      '¿Seguro que quieres cancelar la partida para todos?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', onPress: handleEndGameEarly, style: 'destructive' }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60, paddingBottom: 0 }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {countdown !== null ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingSubtext}>RONDA {currentRound} DE {rounds}</Text>
          <Text style={styles.spinLetter}>{countdown}</Text>
          <Text style={styles.waitingText}>La letra será: ?</Text>
          
          <View style={{ marginTop: 40, width: '100%', backgroundColor: '#18181b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
              POSICIONES ACTUALES
            </Text>
            {roundData && roundData.length > 0 ? (
              roundData.map((player: any, index: number) => (
                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
                  <Text style={{ color: '#a1a1aa', fontSize: 16 }}>{player.player_name}</Text>
                  <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold' }}>{player.total_score || 0} pts</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#52525b', textAlign: 'center' }}>Cargando puntajes...</Text>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* NUEVO HUD SUPERIOR */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, width: '100%', backgroundColor: '#18181b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
            
            {/* Izquierda: Letra */}
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 60, height: 60, backgroundColor: '#27272a', borderRadius: 8 }}>
              <Text style={{ color: '#6366f1', fontSize: 42, fontWeight: '900' }}>{currentLetter}</Text>
            </View>
            
            {/* Centro: Tiempo y Ronda */}
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 10 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                RONDA {currentRound}/{rounds}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: roundTime !== null && roundTime <= 10 ? '#ef4444' : '#10b981' }}>
                {roundTime !== null ? `⏱ ${roundTime}s` : '⏱ --'}
              </Text>
            </View>

            {/* Derecha: Puntajes y Salir */}
            <View style={{ alignItems: 'flex-end', minWidth: 90 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#a1a1aa', fontSize: 10, fontWeight: 'bold', marginRight: 10 }}>POSICIONES</Text>
                <TouchableOpacity onPress={confirmCancel}>
                  <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold' }}>✖</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ width: '100%' }}>
                {roundData && roundData.length > 0 ? (
                  roundData.map((player: any, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#d4d4d8', fontSize: 12, marginRight: 8 }} numberOfLines={1}>
                        {player.player_name.substring(0, 5)}
                      </Text>
                      <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold' }}>
                        {player.total_score || 0}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#d4d4d8', fontSize: 12 }}>Tú</Text>
                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold' }}>{myTotalScore}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          <ScrollView 
            style={{ flex: 1, width: '100%' }} 
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.boardContainer}>
              {gameCategories.map((cat: string, index: number) => (
                <View key={cat} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
                  <TextInput 
                    style={styles.gameInput} 
                    value={answers[cat] || ''} 
                    onChangeText={val => setAnswers((prev: any) => ({ ...prev, [cat]: val }))}
                    placeholder={`Escribe un ${cat.replace('_', ' ')}`}
                    placeholderTextColor="#52525b"
                    autoCapitalize="none"
                    ref={(el) => { inputRefs.current[index] = el; }}
                    returnKeyType={index === gameCategories.length - 1 ? 'done' : 'next'}
                    blurOnSubmit={index === gameCategories.length - 1}
                    onSubmitEditing={() => {
                      if (index < gameCategories.length - 1) {
                        inputRefs.current[index + 1]?.focus();
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.fabButton, isBastaLocked && styles.fabButtonDisabled]} 
            onPress={handleBasta}
            disabled={isBastaLocked}
          >
            <Text style={styles.fabText}>
              {isBastaLocked ? `${lockedSeconds}s` : 'TUTI\nFRUTI'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
};