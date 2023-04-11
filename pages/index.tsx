import React, { useEffect, useState } from 'react';
import { Container, Typography } from '@mui/material';
import { useSettingsStore } from '../utilities/store';

const extractRecommendation = (rawResponse) => {
  const recommendationStartIndex = rawResponse.indexOf('}') + 1;
  const recommendationText = rawResponse.slice(recommendationStartIndex).trim();
  const [name, description] = recommendationText.split(',', 2).map((s) => s.trim());
  return { name, description };
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
    return { name: 'Failed to fetch recommendation', description: '' };
  }
};

const Index = () => {
  const [recommendation, setRecommendation] = useState({ name: '', description: '' });
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
      <Typography variant="h6" component="p" textAlign="center" mt={5}>
        {recommendation.name ? recommendation.name : 'Fetching recommendation...'}
      </Typography>
      <Typography variant="body1" component="p" textAlign="center" mt={1}>
        {recommendation.description}
      </Typography>
    </Container>
  );
};

export default Index;
