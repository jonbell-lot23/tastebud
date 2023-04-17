import { PrismaClient, MovieRatings } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

const mapRatingEnumToAction = (ratingEnum) => {
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

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = 1;

  try {
    console.log('Fetching movie preferences...');
    const preferences = await prisma.movieRatings.findMany({
      where: { userId: userId },
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
    }, {} as Record<string, string[]>);

    console.log('Mapped preferences by action:', preferencesByAction);

    res.status(200).json(preferencesByAction);
  } catch (error) {
    console.error('Error fetching movie preferences:', error);
    res.status(500).json({ error: 'Failed to fetch movie preferences' });
  }
};

export { handler as default };
