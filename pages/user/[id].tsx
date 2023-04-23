import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSettingsStore } from '../../utilities/store';
import MoviePoster from '../../components/MoviePoster';
import RandomPrompt from '../../components/RandomPrompt';

type Recommendation = {
  name: string;
  reason: string;
};

const extractRecommendations = (rawResponse: string): Recommendation[] => {
  const cleanedResponse = rawResponse.replace(/\\\\/g, '\\');
  const extractedRecommendations = JSON.parse(cleanedResponse);
  const recommendations: Recommendation[] = [];

  for (const key in extractedRecommendations) {
    const { name, reason } = extractedRecommendations[key];
    recommendations.push({ name, reason });
  }

  console.log('Extracted recommendations:', recommendations);
  return recommendations;
};

const fetchRecommendation = async (apiKey: string, model: string, systemMessage: string): Promise<Recommendation[]> => {
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
    const cleanedRawResponse = rawResponse.replace(/^\{"model":"[^"]+"\}/, '');
    console.log('Cleaned raw response:', cleanedRawResponse);

    const recommendations = extractRecommendations(cleanedRawResponse);

    return recommendations;
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return [{ name: 'Failed to fetch recommendation', reason: '' }];
  }
};

const buildSystemMessage = (preferences: Record<string, string[]>): string => {
  const randomPrompt = RandomPrompt();

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
  )} Considering the ratings so far, return a list of four movie recommendations. ${randomPrompt} Please return your response in a strict JSON object format, with each recommendation containing a name and reason for recommendation. The reason for recommendation should be concise and focus on why people like it, rather than being a review of the movie. Example format: {"1": {"name": "Movie Name", "reason": "Reason"}, "2": {"name": "Movie Name", "reason": "Reason"}}.`;

  console.log(totalMessage);
  return totalMessage;
};

const fetchMoviePreferences = async (userId: number): Promise<Record<string, string[]>> => {
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

type MoviePreferencesProps = {
  preferences: Record<string, string[]>;
};

const MoviePreferences = ({ preferences }: MoviePreferencesProps): JSX.Element => {
  const leftColumn = ['Interested', 'Like'];
  const rightColumn = ["Didn't like", 'Not interested', 'Unsure'];

  const renderPreferences = (keys: string[]) => {
    return keys.map((key) => (
      <div key={key}>
        <h3>{key}:</h3>
        <div>
          {(preferences[key] || []).map((movie, index) => (
            <span key={index}>
              <MoviePoster movieTitle={movie} width="20px" />
            </span>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ flex: '0 0 45%' }}>{renderPreferences(leftColumn as string[])}</div>
      <div style={{ flex: '0 0 45%' }}>{renderPreferences(rightColumn as string[])}</div>
    </div>
  );
};

const Index = (): JSX.Element => {
  const router = useRouter();
  const { id } = router.query;
  const userId = id && typeof id === 'string' ? parseInt(id) : NaN;

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { apiKey, chatModelId } = useSettingsStore((state) => ({
    apiKey: state.apiKey,
    chatModelId: state.chatModelId,
  }));

  const [moviePreferences, setMoviePreferences] = useState({});

  useEffect(() => {
    const fetchAndDisplayData = async () => {
      const fetchedPreferences = await fetchMoviePreferences(userId);
      setMoviePreferences(fetchedPreferences); // Add this line

      const systemMessage = buildSystemMessage(fetchedPreferences);
      const fetchedRecommendations = await fetchRecommendation(apiKey, chatModelId, systemMessage);
      setRecommendations(fetchedRecommendations);
    };

    if (apiKey && chatModelId && !isNaN(userId)) {
      fetchAndDisplayData();
    }
  }, [apiKey, chatModelId, userId]); // Add userId to the dependency array as well.

  const handleButtonClick = async (recommendation: Recommendation, action: string) => {
    console.log(`"${recommendation.name}" marked as "${action}"`);

    try {
      const response = await fetch('/api/rate_movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
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
      <MoviePreferences preferences={moviePreferences} />
      {recommendations.length ? (
        recommendations.map((recommendation, index) => (
          <React.Fragment key={index}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <MoviePoster movieTitle={recommendation.name} width="130px" />
              <div style={{ marginLeft: '1rem' }}>
                <p>{recommendation.reason}</p>
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
              </div>
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
