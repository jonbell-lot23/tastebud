import axios from 'axios';

const apiKey = 'e756c563bc45a1b70c05ee42f7c3ff95';
const baseURL = 'https://api.themoviedb.org/3';

export const fetchMoviePoster = async (movieTitle) => {
  try {
    const response = await axios.get(`${baseURL}/search/movie`, {
      params: {
        api_key: apiKey,
        query: movieTitle,
      },
    });

    if (response.data.results.length > 0) {
      const imagePath = `https://image.tmdb.org/t/p/w500${response.data.results[0].poster_path}`;
      return imagePath;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch movie poster:', error);
    return null;
  }
};
