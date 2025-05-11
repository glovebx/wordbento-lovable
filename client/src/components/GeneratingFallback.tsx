
import { FourSquare } from "react-loading-indicators";

interface LoadingFallbackProps {
  message: string;
}

const GeneratingFallback: React.FC<LoadingFallbackProps> = ({
  message
}) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center p-8">
        <FourSquare color="#a855f74d" />
        {message && (
          <p className="text-lg text-gray-600">{message}</p>
          )}
      </div>
    </div>
  );
};

export default GeneratingFallback;