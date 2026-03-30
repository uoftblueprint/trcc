import React from "react";

type HeaderWithIconProps = {
  icon: React.ElementType;
  label: string;
};

export const HeaderWithIcon = ({
  icon: Icon,
  label,
}: HeaderWithIconProps): React.JSX.Element => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="w-4 h-4 text-gray-900 shrink-0" />
    <span className="truncate">{label}</span>
  </div>
);
