import React from "react";

type HeaderWithIconProps = {
  icon: React.ElementType;
  label: string;
};

export const HeaderWithIcon = ({
  icon: Icon,
  label,
}: HeaderWithIconProps): React.JSX.Element => (
  <div className="flex items-center gap-2">
    <Icon className="w-3 h-3 text-gray-900" />
    <span>{label}</span>
  </div>
);
