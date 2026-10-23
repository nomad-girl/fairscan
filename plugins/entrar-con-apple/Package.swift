// swift-tools-version: 5.9
import PackageDescription

// Entrar con Apple nativo para FairScan (23/10/2026). Plugin local: lo toma `npx cap sync` desde package.json.
let package = Package(
    name: "EntrarConApple",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "EntrarConApple", targets: ["EntrarConApple"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.1")
    ],
    targets: [
        .target(
            name: "EntrarConApple",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/EntrarConApple")
    ]
)
