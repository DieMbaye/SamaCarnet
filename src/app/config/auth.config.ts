/*export const AUTH_CONFIG = {
  // Temps d'inactivité en minutes avant déconnexion automatique
  autoLogout: {
    admin: 60,        // 1 heure pour les admins
    medecin: 120,     // 2 heures pour les médecins  
    patient: 30,      // 30 minutes pour les patients
    default: 30       // 30 minutes par défaut
  },
  
  // Persistance Firebase
  persistence: 'session' // 'local' | 'session' | 'none'
};
*/
export const AUTH_CONFIG = {
  autoLogout: {
    admin: 1,        // 1 minute pour tester
    medecin: 2,      // 2 minutes pour tester   patient: 1,      // 1 minute pour tester
    default: 1       // 1 minute par défaut
  },
  persistence: 'session'
};