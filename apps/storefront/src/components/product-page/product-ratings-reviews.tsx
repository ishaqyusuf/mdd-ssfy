interface ProductRatingsAndReviewsProps {
  rating?: number;
  reviews?: {
    id: string;
    author: string;
    rating: number;
    comment: string;
  }[];
}

export function ProductRatingsAndReviews({ rating, reviews }: ProductRatingsAndReviewsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
      {rating && (
        <div className="flex items-center space-x-2">
          <span className="text-xl font-semibold">{rating} / 5</span>
          {/* Add star icons here based on rating */}
        </div>
      )}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-t pt-4">
              <p className="font-semibold">{review.author} - {review.rating}/5 Stars</p>
              <p className="text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
      )}
    </div>
  );
}
