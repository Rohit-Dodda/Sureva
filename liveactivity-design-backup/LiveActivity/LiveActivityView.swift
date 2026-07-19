import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  /// Lock Screen / banner presentation of the Sureva sun-protection Live Activity.
  /// Shares the same visual language as the Dynamic Island expanded view: a live
  /// protection gauge, protection-band color logic, and a soft orange brand glow
  /// on a charcoal field.
  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    private var level: ProtectionLevel {
      ProtectionLevel(progress: contentState.progress)
    }

    var body: some View {
      let level = self.level

      ZStack {
        // Charcoal field with a soft, continuous protection wash across the
        // bottom (green when protected, sliding toward red) — the same visual
        // language as the Dynamic Island expanded card — plus a soft orange
        // glow anchored behind the gauge.
        SurevaColors.charcoal
        LinearGradient(
          colors: [
            SurevaWash.baseColor(for: level.progress).opacity(0),
            SurevaWash.baseColor(for: level.progress).opacity(0.32),
          ],
          startPoint: .top,
          endPoint: .bottom
        )
        SurevaGlow(radius: 150, opacity: 0.30)
          .frame(width: 300, height: 300)
          .offset(x: -120)

        VStack(spacing: 12) {
          HStack(spacing: 14) {
            // Protection gauge.
            SurevaGauge(level: level, lineWidth: 6, showsPercent: true)
              .frame(width: 52, height: 52)

            // Title + live status word.
            VStack(alignment: .leading, spacing: 3) {
              Text(contentState.title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

              Text(level.statusWord)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(level.color)
                .lineLimit(1)

              if let subtitle = contentState.subtitle, !subtitle.isEmpty {
                Text(subtitle)
                  .font(.system(size: 12, weight: .medium, design: .rounded))
                  .foregroundStyle(.white.opacity(0.6))
                  .lineLimit(1)
                  .minimumScaleFactor(0.8)
              }
            }

            Spacer(minLength: 6)

            // Brand stamp + countdown.
            VStack(alignment: .trailing, spacing: 3) {
              SurevaMark(size: 20, cornerRadius: 6)

              if let date = contentState.timerEndDateInMilliseconds {
                Text("REAPPLY IN")
                  .font(.system(size: 9, weight: .semibold, design: .rounded))
                  .tracking(1.0)
                  .foregroundStyle(.white.opacity(0.5))

                Text(timerInterval: Date.toTimerInterval(miliseconds: date), countsDown: true)
                  .font(.system(size: 22, weight: .bold, design: .rounded))
                  .monospacedDigit()
                  .foregroundStyle(.white)
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
                  .frame(maxWidth: 110, alignment: .trailing)
                  .multilineTextAlignment(.trailing)
              }
            }
          }

          // Protection-colored timer bar (or static protection bar as fallback).
          if let date = contentState.timerEndDateInMilliseconds {
            ProgressView(
              timerInterval: Date.toTimerInterval(miliseconds: date),
              countsDown: true,
              label: { EmptyView() },
              currentValueLabel: { EmptyView() }
            )
            .tint(level.color)
          } else {
            ProgressView(value: level.progress)
              .tint(level.color)
          }
        }
        .padding(EdgeInsets(top: 16, leading: 18, bottom: 16, trailing: 18))
      }
    }
  }

#endif
