import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSettingsStore } from '../../utilities/store';

const extractRecommendations = (rawResponse) => {
  const extractedRecommendations = JSON.parse(rawResponse);
  const recommendations = [];

  for (const key in extractedRecommendations) {
    const { name, reason } = extractedRecommendations[key];
    recommendations.push({ name, reason });
  }

  console.log('Extracted recommendations:', recommendations);
  return recommendations;
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

    // Replace response.text() with response.json()
    const rawResponse = await response.text();
    console.log('API raw response:', rawResponse);
    const cleanedRawResponse = rawResponse.replace(/^\{"model":"[^"]+"\}/, '');
    console.log('Cleaned raw response:', cleanedRawResponse);
    const jsonResponse = JSON.parse(cleanedRawResponse);

    console.log('API JSON response:', jsonResponse);
    const recommendations = extractRecommendations(cleanedRawResponse);

    return recommendations;
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return { name: 'Failed to fetch recommendation', description: '' };
  }
};

const buildSystemMessage = (preferences) => {
  const actions = [
    { key: 'Like', label: 'liked' },
    { key: "Didn't like", label: 'not liked' },
    { key: 'Interested', label: 'Interested' },
    { key: 'Not interested', label: 'Not Interested' },
    { key: 'Unsure', label: 'unsure' },
  ];

  const preferenceDescriptions = actions.map((action) => {
    const movies = preferences[action.key] || [];
    const prefMessage = `Here are movies marked by this user as ${action.label}: ${movies.length ? movies.join(', ') : '(none)'}.`;
    console.log(prefMessage);
    return prefMessage;
  });

  const totalMessage = `${preferenceDescriptions.join(
    ' ',
  )} Give me a list of four movie recommendations. Please return your response in a strict JSON object format, with each recommendation containing a name and reason for recommendation. The reason for recommendation should be concise and focus on why people like it, rather than being a review of the movie. Example format: {"1": {"name": "Movie Name", "reason": "Reason"}, "2": {"name": "Movie Name", "reason": "Reason"}}. DO NOT LIST ANY MOVIES I ALREADY MENTIONED IN THIS RESPONSE. DO NOT LIST ANY OTHER RESPONSE OTHER THAN THE JSON LIST OF FOUR MOVIES.`;

  console.log(totalMessage);
  return totalMessage;
};

const fetchMoviePreferences = async (userId) => {
  try {
    const response = await fetch(`/api/get_movie_preferences?userId=${userId}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const responseJson = await response.json();
    const mappedResponse = {
      Like: responseJson.Like || [],
      "Didn't like": responseJson["Didn't like"] || [],
      Interested: responseJson.Interested || [],
      'Not interested': responseJson['Not interested'] || [],
      Unsure: responseJson.Unsure || [],
    };
    return mappedResponse;
  } catch (error) {
    console.error('Error fetching movie preferences:', error);
    return {};
  }
};

const Index = () => {
  const router = useRouter();
  const { id } = router.query;
  const userId = parseInt(id);

  const [recommendations, setRecommendations] = useState([]);
  const { apiKey, chatModelId } = useSettingsStore((state) => ({
    apiKey: state.apiKey,
    chatModelId: state.chatModelId,
  }));

  useEffect(() => {
    const fetchAndDisplayData = async () => {
      const fetchedPreferences = await fetchMoviePreferences(userId);
      const systemMessage = buildSystemMessage(fetchedPreferences);
      const fetchedRecommendations = await fetchRecommendation(apiKey, chatModelId, systemMessage);
      setRecommendations(fetchedRecommendations);
    };

    if (apiKey && chatModelId && !isNaN(userId)) {
      fetchAndDisplayData();
    }
  }, [apiKey, chatModelId, userId]); // Add userId to the dependency array as well.

  const handleButtonClick = async (recommendation, action) => {
    console.log(`"${recommendation.name}" marked as "${action}"`);

    try {
      const response = await fetch('/api/rate_movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId, // Add this line
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
