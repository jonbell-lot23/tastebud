import { PrismaClient, MovieRatings } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type RatingAction = 'Like' | "Didn't like" | 'Interested' | 'Not interested' | 'Unsure';

type MoviePreferences = {
  [key in RatingAction]: string[];
};

const mapRatingEnumToAction = (ratingEnum: string): RatingAction => {
  switch (ratingEnum) {
    case 'Like':
      return 'Like';
    case 'DidNotLike':
      return "Didn't like";
    case 'Interested':
      return 'Interested';
    case 'NotInterested':
      return 'Not interested';
    case 'Unsure':
      return 'Unsure';
    default:
      throw new Error(`Invalid rating enum value: ${ratingEnum}`);
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse<MoviePreferences | { error: string }>) => {
  const { userId } = req.query;
  const parsedUserId = parseInt(userId as string);

  if (isNaN(parsedUserId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  try {
    console.log('Fetching movie preferences...');
    const preferences = await prisma.movieRatings.findMany({
      where: { userId: parsedUserId },
      include: { movie: true },
    });

    console.log('Fetched movie preferences:', preferences);

    const preferencesByAction = preferences.reduce((acc, pref) => {
      const action = mapRatingEnumToAction(pref.rating);
      if (!acc[action]) {
        acc[action] = [];
      }
      acc[action].push(pref.movie.title);
      return acc;
    }, {} as MoviePreferences);

    console.log('Mapped preferences by action:', preferencesByAction);

    res.status(200).json(preferencesByAction);
  } catch (error) {
    console.error('Error fetching movie preferences:', error);
    res.status(500).json({ error: 'Failed to fetch movie preferences' });
  }
};

export default handler;
