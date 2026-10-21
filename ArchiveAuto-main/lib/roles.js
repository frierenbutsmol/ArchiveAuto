// Which area of the app each role lands in after signing in.
//   user      -> MainTabs      (their own garage, records, chat, alerts)
//   mechanic  -> MechanicTabs  (vehicles owners shared with them)
//   admin     -> AdminTabs     (users, statistics, audit log)
// The server enforces all of this too; this only decides what the app shows.
export const ROLE_ROUTES = {
  user: 'MainTabs',
  mechanic: 'MechanicTabs',
  admin: 'AdminTabs',
};

export const routeForRole = (role) => ROLE_ROUTES[role] || ROLE_ROUTES.user;

export const ROLE_LABELS = {
  user: 'Vehicle Owner',
  mechanic: 'Mechanic',
  admin: 'Administrator',
};