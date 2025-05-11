
import { Mosaic } from "react-loading-indicators";

interface LoadingFallbackProps {
  message: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message
}) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center p-8">
        <Mosaic color="#a855f74d" />
        <p className="text-lg text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingFallback;