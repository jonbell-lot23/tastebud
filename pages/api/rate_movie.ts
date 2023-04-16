import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { movieTitle, action } = req.body;

  try {
    const movie = await prisma.movie.upsert({
      where: { title: movieTitle },
      update: {},
      create: { title: movieTitle },
    });

    const rating = await prisma.movieRatings.create({
      data: {
        rating: action,
        rationale: '',
        movie: {
          connect: {
            id: movie.id,
          },
        },
        user: {
          connectOrCreate: {
            where: { id: 1 }, // Use a hardcoded user ID for now, replace with actual user ID in a real app
            create: {},
          },
        },
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
};
