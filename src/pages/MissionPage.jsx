import { Navigate, useLocation } from 'react-router-dom';

// The Mission page was merged into About. Anything still pointing at /mission
// lands on /about, with its query string kept.
export default function MissionPage() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/about', search }} replace />;
}
