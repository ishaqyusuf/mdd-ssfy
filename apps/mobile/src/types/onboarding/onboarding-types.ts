export interface onboardingSlidesType {
  // color: string
  title: string
  image: any
  secondTitle: string
  subTitle: string
}

export interface OnboardingState {
  hasCompletedOnboarding: boolean
  completeOnboarding: (hasCompletedOnboarding: boolean) => void
}
