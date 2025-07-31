"use client";

import { Star, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/progress";

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  helpful: number;
  verified: boolean;
}

interface ProductReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

export function ProductReviews({
  reviews,
  averageRating,
  totalReviews,
  ratingDistribution,
}: ProductReviewsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.floor(averageRating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {totalReviews} reviews
            </div>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <span className="text-sm w-3">{rating}</span>
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Progress
                  value={(ratingDistribution[rating] / totalReviews) * 100}
                  className="flex-1 h-2"
                />
                <span className="text-sm text-gray-600 w-8">
                  {ratingDistribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Reviews */}
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{review.author}</span>
                    {review.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      {review.date}
                    </span>
                  </div>
                </div>
              </div>

              <h4 className="font-medium mb-2">{review.title}</h4>
              <p className="text-gray-700 mb-3">{review.content}</p>

              <Button variant="ghost" size="sm" className="text-gray-600">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful ({review.helpful})
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
