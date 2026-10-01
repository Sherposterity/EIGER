import usePageHead from '../components/usePageHead';
import { STATIC_HEADS } from '../lib/routeHeads';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import MountainRequest from '../components/home/MountainRequest';

// Standalone "Which mountain next?" page: the home section with the full
// leaderboard, for sharing a direct link.
const RequestPage = () => {
  usePageHead(STATIC_HEADS['/request']);
  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />
      <main>
        <MountainRequest standalone />
      </main>
      <Footer />
    </div>
  );
};

export default RequestPage;
