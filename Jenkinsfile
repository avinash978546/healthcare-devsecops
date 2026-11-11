pipeline {
  agent any
  environment {
    IMAGE = "healthcare-app:${BUILD_NUMBER}"
    SONAR_HOST = "http://localhost:9000"
  }
  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('SAST - SonarQube') {
      steps {
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker run --rm --network host -u "$(id -u):$(id -g)" \
              -e SONAR_HOST_URL=$SONAR_HOST -e SONAR_TOKEN=$SONAR_TOKEN \
              -v "$PWD":/usr/src sonarsource/sonar-scanner-cli
          '''
        }
      }
    }

    stage('Build Image') { steps { sh 'docker build -t $IMAGE .' } }

    stage('Container Scan - Trivy') {
      steps {
        sh '''
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            -v trivy-cache:/root/.cache aquasec/trivy:latest image \
            --severity HIGH,CRITICAL --exit-code 0 $IMAGE
        '''
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          docker save $IMAGE | docker exec -i minikube docker load
          kubectl apply -f k8s/rbac.yaml
          sed "s|IMAGE_PLACEHOLDER|$IMAGE|" k8s/deployment.yaml | kubectl apply -f -
          kubectl -n healthcare rollout status deployment/healthcare-app --timeout=120s
        '''
      }
    }

    stage('DAST - OWASP ZAP') {
      steps {
        sh '''
          NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
          mkdir -p zap && chmod 777 zap
          docker run --rm --network host -v "$PWD/zap":/zap/wrk:rw \
            ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
            -t http://$NODE_IP:30080 -r zap-report.html || true
        '''
        archiveArtifacts artifacts: 'zap/zap-report.html', allowEmptyArchive: true
      }
    }
  }
}
