import React from 'react';

const genres = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'mystery', 'romance', 'sci-fi', 'thriller'];

const getRandomYear = () => {
  return Math.floor(Math.random() * (2015 - 1960 + 1)) + 1960;
};

const getRandomGenre = () => {
  return genres[Math.floor(Math.random() * genres.length)];
};

const prompts = [
  'Show me movies that have strong female leads.',
  'Show me movies that were groundbreaking for their time.',
  'Show me movies that won an Oscar for Best Picture.',
  'Show me critically acclaimed documentaries.',
  'Show me movies that feature an ensemble cast.',
  `Show me movies of the genre ${getRandomGenre()} that I'd know if I was born in the year ${getRandomYear()}`,
  // Add more prompts here
];

const RandomPrompt = () => {
  const randomPromptIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomPromptIndex];
};

export default RandomPrompt;
