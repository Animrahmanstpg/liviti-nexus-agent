import AdUnit from "./AdUnit";

interface LeaderboardAdProps {
  position?: "top" | "bottom";
  className?: string;
}

const LeaderboardAd = ({ position = "top", className = "" }: LeaderboardAdProps) => {
  const placement = position === "top" ? "leaderboard_top" : "leaderboard_bottom";
  
  return (
    <div className={`w-full flex justify-center ${className}`}>
      <AdUnit 
        placement={placement}
      />
    </div>
  );
};

export default LeaderboardAd;
