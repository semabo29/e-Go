import { getApiUrl } from '@/constants/api';

export interface Review {
    id: number;
    puntuacio: number;
    comentari: string;
    data_publicacio: string;
    data_actualitzacio: string;
    usuari_id: number;
    username: string;
    likes_count: number;
    user_has_liked: boolean;
}

// OBTENIR RESSENYES
export const getStationReviews = async (stationId: number, userId?: number): Promise<Review[]> => {
    const url = userId ? `${getApiUrl()}/stations/${stationId}/reviews?userId=${userId}` : `${getApiUrl()}/stations/${stationId}/reviews`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error carregant ressenyes');
    return response.json();
};

// CREAR RESSENYA
export const addStationReview = async (stationId: number, puntuacio: number, comentari: string, token: string) => {
    const response = await fetch(`${getApiUrl()}/stations/${stationId}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ puntuacio, comentari })
    });
    if (!response.ok) throw new Error('Error afegint la ressenya');
    return response.json();
};

// EDITAR RESSENYA
export const updateStationReview = async (reviewId: number, puntuacio: number, comentari: string, token: string) => {
    const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ puntuacio, comentari })
    });
    if (!response.ok) throw new Error('Error editant la ressenya');
    return response.json();
};

// ESBORRAR RESSENYA
export const deleteStationReview = async (reviewId: number, token: string) => {
    const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Error esborrant la ressenya');
    return response.json();
};

// ENDPOINT PER ALTERNAR EL LIKE
export const toggleReviewLike = async (reviewId: number, token: string) => {
  const response = await fetch(`${getApiUrl()}/reviews/${reviewId}/like`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error donant like a la ressenya');
  return response.json();
};