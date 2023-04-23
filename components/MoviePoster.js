import { useEffect, useState } from 'react';
import { fetchMoviePoster } from '../pages/api/movieAPI';

const MoviePoster = ({ movieTitle, width }) => {
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    const fetchPoster = async () => {
      const fetchedPoster = await fetchMoviePoster(movieTitle);
      setPoster(fetchedPoster);
    };

    fetchPoster();
  }, [movieTitle]);

  return <>{poster ? <img src={poster} alt={`Poster for ${movieTitle}`} style={{ width: width }} /> : <p>No poster available</p>}</>;
};

export default MoviePoster;
