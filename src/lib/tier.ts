export type Tier = 'free' | 'pro' | 'lab';

export const isPro = (tier?: Tier) => tier === 'pro' || tier === 'lab';
