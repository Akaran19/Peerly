{
  "config": {
    "target": "http://localhost:5173",
    "phases": [
      { "duration": 120, "arrivalRate": 1 },
      { "duration": 300, "arrivalRate": 5 },
      { "duration": 120, "arrivalRate": 10 },
      { "duration": 300, "arrivalRate": 10 },
      { "duration": 120, "arrivalRate": 0 }
    ],
    "defaults": {
      "headers": {
        "User-Agent": "Artillery Load Test"
      }
    }
  },
  "scenarios": [
    {
      "name": "Homepage and Navigation",
      "weight": 60,
      "flow": [
        {
          "get": {
            "url": "/",
            "expect": [
              { "statusCode": 200 },
              { "hasProperty": "responseTime", "lte": 2000 }
            ]
          }
        },
        {
          "think": 2
        },
        {
          "get": {
            "url": "/api/search?q=machine+learning",
            "expect": [
              { "statusCode": 200 },
              { "hasProperty": "responseTime", "lte": 3000 }
            ]
          }
        }
      ]
    },
    {
      "name": "Paper Loading",
      "weight": 25,
      "flow": [
        {
          "get": {
            "url": "/",
            "expect": [
              { "statusCode": 200 }
            ]
          }
        },
        {
          "think": 3
        },
        {
          "get": {
            "url": "/paper/10.1038/s41586-023-12345",
            "expect": [
              { "statusCode": 200 },
              { "hasProperty": "responseTime", "lte": 3000 }
            ]
          }
        }
      ]
    },
    {
      "name": "API Calls",
      "weight": 15,
      "flow": [
        {
          "get": {
            "url": "/api/papers/search",
            "qs": { "q": "neural networks", "limit": 10 },
            "expect": [
              { "statusCode": 200 },
              { "hasProperty": "responseTime", "lte": 1000 }
            ]
          }
        },
        {
          "think": 1
        },
        {
          "get": {
            "url": "/api/authors/123",
            "expect": [
              { "statusCode": 200 },
              { "hasProperty": "responseTime", "lte": 1000 }
            ]
          }
        }
      ]
    }
  ]
}
