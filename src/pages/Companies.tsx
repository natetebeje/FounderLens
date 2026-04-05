// /companies now redirects to /build — AI Companies is inside the Build tab
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Companies() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/build', { replace: true }); }, [navigate]);
  return null;
}
