import { PrismaClient, MovieRatings } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

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
      if (!acc[pref.rating]) {
        acc[pref.rating] = [];
      }
      acc[pref.rating].push(pref.movie.title);
      return acc;
    }, {} as Record<MovieRatings['rating'], string[]>);

    console.log('Mapped preferences by action:', preferencesByAction);

    res.status(200).json(preferencesByAction);
  } catch (error) {
    console.error('Error fetching movie preferences:', error);
    res.status(500).json({ error: 'Failed to fetch movie preferences' });
  }
};

export { handler as default };
