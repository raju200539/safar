import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

const TEAL = '#0B6E4F';
const WHITE = '#FFFFFF';
const PURPLE = '#7B2CBF';

/** Safar brand mark: bus + metro on a shared route line. Any size. */
export function BrandMark({ size = 120 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Rect x={8} y={8} width={496} height={496} rx={112} fill={TEAL} />
      {/* Bus (left) */}
      <G fill={WHITE}>
        <Rect x={64} y={148} width={168} height={188} rx={26} />
        <Circle cx={116} cy={352} r={26} />
        <Circle cx={196} cy={352} r={26} />
      </G>
      <Rect x={88} y={172} width={120} height={66} rx={12} fill={TEAL} />
      <Rect x={88} y={248} width={120} height={16} rx={4} fill={TEAL} />
      <Rect x={104} y={252} width={52} height={8} rx={2} fill={WHITE} />
      <Circle cx={112} cy={292} r={13} fill={TEAL} />
      <Circle cx={184} cy={292} r={13} fill={TEAL} />
      <Circle cx={116} cy={352} r={10} fill={TEAL} />
      <Circle cx={196} cy={352} r={10} fill={TEAL} />
      {/* Metro (right) */}
      <G fill={WHITE}>
        <Rect x={280} y={148} width={168} height={188} rx={44} />
        <Circle cx={328} cy={352} r={26} />
        <Circle cx={400} cy={352} r={26} />
      </G>
      <Rect x={304} y={172} width={120} height={60} rx={14} fill={PURPLE} />
      <Rect x={304} y={242} width={120} height={16} rx={4} fill={TEAL} />
      <Circle cx={328} cy={352} r={10} fill={TEAL} />
      <Circle cx={400} cy={352} r={10} fill={TEAL} />
      <Rect x={348} y={286} width={32} height={12} rx={6} fill={TEAL} />
      {/* Shared route line with stops */}
      <Line
        x1={56}
        y1={412}
        x2={456}
        y2={412}
        stroke={WHITE}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="2,22"
      />
      {[56, 256, 456].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={412} r={14} fill={WHITE} />
          <Circle cx={cx} cy={412} r={6} fill={TEAL} />
        </G>
      ))}
    </Svg>
  );
}
