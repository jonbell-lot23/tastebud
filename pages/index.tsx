import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../utilities/store';

const extractRecommendations = (rawResponse) => {
  const [_, movieResponse] = rawResponse.split('}{');
  const jsonResponse = JSON.parse(`{${movieResponse}`);

  const extractedRecommendations = [];
  for (const key in jsonResponse) {
    const { name, reason } = jsonResponse[key];
    extractedRecommendations.push({ name, reason });
  }

  // console.log('Extracted recommendations:', extractedRecommendations);
  return extractedRecommendations;
};

const fetchRecommendation = async (apiKey, model, systemMessage) => {
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
    console.error('Error fetching recommendation:', error);
    return { name: 'Failed to fetch recommendation', description: '' };
  }
};

const buildSystemMessage = (preferences) => {
  const actions = [
    { key: 'liked', label: 'liked' },
    { key: 'notLiked', label: 'not liked' },
    { key: 'interested', label: 'Interested' },
    { key: 'notInterested', label: 'Not Interested' },
    { key: 'unsure', label: 'unsure' },
  ];

  const preferenceDescriptions = actions.map((action) => {
    const movies = preferences[action.key] || [];
    const message = `Here are movies marked by this user as ${action.label}: ${movies.length ? movies.join(', ') : '(none)'}.`;
    console.log(message);
    return message;
  });

  return `Please recommend four movies to me that are not included in the list below. ${preferenceDescriptions.join(
    ' ',
  )} Considering what movies the person liked, did not like, and are interested in, please recommend four movies that are not mentioned already. Please return as a strict JSON object in the format of name, reason for recommendation. The reason for recommendation should be concise and focus on why people like it, rather than being a review of the movie.`;
};

// Add this function before the `Index` component
const fetchMoviePreferences = async () => {
  try {
    const response = await fetch('/api/get_movie_preferences');
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const responseJson = await response.json();
    const mappedResponse = {
      liked: responseJson.liked || [],
      notLiked: responseJson.not_liked || [],
      interested: responseJson.interested || [],
      notInterested: responseJson.not_interested || [],
      unsure: responseJson.unsure || [],
    };
    return mappedResponse;
  } catch (error) {
    console.error('Error fetching movie preferences:', error);
    return {};
  }
};

const Index = () => {
  const [recommendations, setRecommendations] = useState([]);
  const { apiKey, chatModelId } = useSettingsStore((state) => ({
    apiKey: state.apiKey,
    chatModelId: state.chatModelId,
  }));

  useEffect(() => {
    const fetchAndDisplayData = async () => {
      const fetchedPreferences = await fetchMoviePreferences();
      const systemMessage = buildSystemMessage(fetchedPreferences);
      const fetchedRecommendations = await fetchRecommendation(apiKey, chatModelId, systemMessage);
      setRecommendations(fetchedRecommendations);
    };

    if (apiKey && chatModelId) {
      fetchAndDisplayData();
    }
  }, [apiKey, chatModelId]);

  const handleButtonClick = async (recommendation, action) => {
    console.log(`"${recommendation.name}" marked as "${action}"`);

    try {
      const response = await fetch('/api/rate_movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: recommendation.name,
          action: action,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json();
        console.error('API response:', responseBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      console.log(`"${recommendation.name}" saved with rating "${action}" in the database.`);
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  return (
    <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ textAlign: 'center', marginTop: '2rem' }}>TasteBuddy</h1>
      {recommendations.length ? (
        recommendations.map((recommendation, index) => (
          <React.Fragment key={index}>
            <h2 style={{ marginTop: '2rem' }}>{recommendation.name}</h2>
            <p style={{ marginTop: '1rem' }}>{recommendation.reason}</p>
            <div style={{ marginTop: '1rem' }}>
              {['Like', "Didn't like", 'Interested', 'Not interested', 'Unsure'].map((action) => (
                <button
                  key={action}
                  style={{
                    padding: '0.5rem 1rem',
                    marginRight: '0.5rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    backgroundColor: '#efefef',
                  }}
                  onClick={() => handleButtonClick(recommendation, action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </React.Fragment>
        ))
      ) : (
        <h2 style={{ textAlign: 'center', marginTop: '2rem' }}>Fetching recommendations...</h2>
      )}
    </div>
  );
};

export default Index;
