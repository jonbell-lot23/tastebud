import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Button, Box } from '@mui/material';
import { useSettingsStore } from '../utilities/store';

const extractRecommendation = (rawResponse) => {
  const recommendationStartIndex = rawResponse.indexOf('}') + 1;
  return rawResponse.slice(recommendationStartIndex).trim();
};

const fetchRecommendation = async (apiKey, model) => {
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
    const recommendation = extractRecommendation(rawResponse);

    return recommendation;
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return 'Failed to fetch recommendation.';
  }
};

const Index = () => {
  const [recommendation, setRecommendation] = useState('');
  const { apiKey, chatModelId } = useSettingsStore((state) => ({
    apiKey: state.apiKey,
    chatModelId: state.chatModelId,
  }));

  useEffect(() => {
    const fetchAndDisplayRecommendation = async () => {
      const fetchedRecommendation = await fetchRecommendation(apiKey, chatModelId);
      setRecommendation(fetchedRecommendation);
    };

    fetchAndDisplayRecommendation();
  }, [apiKey, chatModelId]);

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" textAlign="center" mt={5}>
        TasteBuddy
      </Typography>
      <Typography variant="body1" textAlign="center" mt={5}>
        {recommendation ? recommendation : 'Fetching recommendation...'}
      </Typography>
    </Container>
  );
};

export default Index;
