import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/globalStyles';

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const LetterRaffle = ({ targetLetter, onFinish }: { targetLetter: string, onFinish: () => void }) => {
  const [displayLetter, setDisplayLetter] = useState("?");

  useEffect(() => {
    let ticks = 0;
    const maxTicks = 30; // 3 segundos cambiando letra cada 100ms
    
    const interval = setInterval(() => {
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setDisplayLetter(targetLetter.toUpperCase()); // Frena en la letra real de la base de datos
        setTimeout(onFinish, 1500); // Pausa de 1.5s para que asimilen la letra antes de jugar
      } else {
        const randomChar = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        setDisplayLetter(randomChar);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [targetLetter]);

  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
      <Text style={{ color: '#fff', fontSize: 24, marginBottom: 20, fontWeight: 'bold' }}>SORTEANDO LETRA...</Text>
      <Text style={{ color: '#6366f1', fontSize: 140, fontWeight: 'bold' }}>{displayLetter}</Text>
    </View>
  );
};