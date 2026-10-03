# OTP with Hyderabad data baked in (no volume needed).
FROM opentripplanner/opentripplanner:2.9.0
COPY data/gtfs /var/opentripplanner/gtfs
COPY data/osm/hyderabad.osm.pbf /var/opentripplanner/osm/
COPY data/otp/build-config.json data/otp/router-config.json /var/opentripplanner/
ENV JAVA_TOOL_OPTIONS=-Xmx4g
# Self-starting: leave Railway's Start Command EMPTY. (The image entrypoint
# appends /var/opentripplanner/ itself, so flags must not repeat the path.)
CMD ["--build", "--serve"]
