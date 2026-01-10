FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    cmake \
    perl \
    bison \
    flex \
    libfl-dev \
    libbz2-dev \
    zlib1g-dev \
    libgsl-dev \
    coinor-libcbc-dev \
    coinor-libclp-dev \
    coinor-libcoinutils-dev \
    coinor-libcgl-dev \
    coinor-libosi-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/optic

# Copy OPTIC sources vendored in this repo
COPY planners/optic/optic/ /opt/optic/

# Build release binary (CLP)
RUN mkdir -p /opt/optic/release \
  && cd /opt/optic/release \
  && cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    -DCMAKE_C_COMPILER=/usr/bin/gcc \
    -DCMAKE_CXX_COMPILER=/usr/bin/g++ \
    -DCMAKE_CXX_STANDARD=11 \
    -DCMAKE_CXX_STANDARD_REQUIRED=ON \
    -DCMAKE_CXX_EXTENSIONS=OFF \
    ../src \
  && make -j1 parser \
  && make -j4 optic-clp

ENTRYPOINT ["/opt/optic/release/optic/optic-clp"]
