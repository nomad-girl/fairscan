// swift-tools-version: 5.9
import PackageDescription

// Entrar con Google nativo para FairScan en iPhone/iPad (25/10/2026). Plugin local: lo toma `npx cap sync` desde package.json.
let package = Package(
    name: "EntrarConGoogle",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "EntrarConGoogle", targets: ["EntrarConGoogle"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.1"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", .upToNextMajor(from: "9.0.0"))
    ],
    targets: [
        .target(
            name: "EntrarConGoogle",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Sources/EntrarConGoogle")
    ]
)
