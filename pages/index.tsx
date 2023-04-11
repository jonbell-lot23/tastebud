import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Button } from '@mui/material';
import { useSettingsStore } from '../utilities/store';

const extractRecommendations = (rawResponse) => {
  const recommendationStartIndex = rawResponse.indexOf('}') + 1;
  const recommendationText = rawResponse.slice(recommendationStartIndex).trim();
  const recommendations = recommendationText.split('\n').map((r) => {
    const [name, reason] = r.split(',', 2).map((s) => s.trim());
    return { name, reason };
  });
  return recommendations;
};

const fetchRecommendations = async (apiKey, model) => {
  const systemMessage =
    'Please recommend four movies to me. They should cover a range of genres and dates, with a bias towards contemporary films. We will be using these movies to help understand your taste so we can make an app around great recommendations. Please return as a JSON in the format of name, reason for recommendation. The reason for recommendation should be concise and focus on why people like it, rather than being a review of the movie.';
  const payload = {
    apiKey: apiKey,
    model: model,
    messages: [
      {
        role: 'system',
        content: systemMessage,
      },
    ],
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.json();
      console.error('API response:', responseBody);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const rawResponse = await response.text();
    console.log('API raw response:', rawResponse);
    const recommendations = extractRecommendations(rawResponse);

    return recommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

const Index = () => {
  const [recommendations, setRecommendations] = useState([]);
  const { apiKey, chatModelId } = useSettingsStore((state) => ({
    apiKey: state.apiKey,
    chatModelId: state.chatModelId,
  }));

  useEffect(() => {
    const fetchAndDisplayRecommendations = async () => {
      const fetchedRecommendations = await fetchRecommendations(apiKey, chatModelId);
      setRecommendations(fetchedRecommendations);
    };

    fetchAndDisplayRecommendations();
  }, [apiKey, chatModelId]);

  const handleButtonClick = (movieTitle, action) => {
    console.log(`You clicked '${action}' for '${movieTitle}'`);
    // Implement your logic to handle the user's choice
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" textAlign="center" mt={5}>
        TasteBuddy
      </Typography>
      <Grid container spacing={3} mt={5}>
        {recommendations.length === 0 ? (
          <Typography variant="body1" component="p" textAlign="center">
            Fetching recommendations...
          </Typography>
        ) : (
          recommendations.map((movie, index) => (
            <Grid item xs={12} key={index}>
              <Typography variant="h6" component="h2">
                {movie.name}
              </Typography>
              <Typography variant="body1" component="p" mb={2}>
                {movie.reason}
              </Typography>
             
