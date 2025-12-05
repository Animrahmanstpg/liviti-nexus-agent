import AdUnit from "./AdUnit";

interface MrecAdProps {
  variant?: "sidebar" | "content";
  className?: string;
}

const MrecAd = ({ variant = "sidebar", className = "" }: MrecAdProps) => {
  const placement = variant === "sidebar" ? "mrec_sidebar" : "mrec_content";
  
  return (
    <AdUnit 
      placement={placement} 
      className={className}
    />
  );
};

export default MrecAd;
