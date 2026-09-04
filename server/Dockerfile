# HanZi.Server — build + runtime
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY HanZi.Server/HanZi.Server.csproj ./
RUN dotnet restore
COPY HanZi.Server/ ./
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Postgres connection qua env: ConnectionStrings__Default
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "HanZi.Server.dll"]
