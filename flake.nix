{
	description = "Portfolio and blog site";

	inputs = {
		nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
	};

	outputs = { self, nixpkgs }:
		let
			supportedSystems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
			forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
		in
		{
			devShells = forAllSystems (system:
				let
					pkgs = nixpkgs.legacyPackages.${system};
				in
				{
					default = pkgs.mkShell {
						buildInputs = [ 
							pkgs.zola 
							pkgs.git 
						];
					};
				});
		};
}
