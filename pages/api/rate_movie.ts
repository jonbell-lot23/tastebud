import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapActionToRatingEnum = (action) => {
  switch (action) {
    case 'Like':
      return 'Like';
    case "Didn't like":
      return 'DidNotLike';
    case 'Interested':
      return 'Interested';
    case 'Not interested':
      return 'NotInterested';
    case 'Unsure':
      return 'Unsure';
    default:
      throw new Error(`Invalid action value: ${action}`);
  }
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, movieTitle, action } = req.body; // Add userId to the destructuring assignment
  const ratingEnumValue = mapActionToRatingEnum(action);


  try {
    const movie = await prisma.movie.upsert({
      where: { title: movieTitle },
      update: {},
      create: { title: movieTitle },
    });

    const rating = await prisma.movieRatings.create({
      data: {
        rating: ratingEnumValue,
        rationale: '',
        movie: {
          connect: {
            id: movie.id,
          },
        },
        user: {
          connectOrCreate: {
            where: { id: parseInt(userId) }, // Update this line to use the userId from the request body
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
